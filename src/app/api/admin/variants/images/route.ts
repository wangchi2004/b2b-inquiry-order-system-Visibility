import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin";
import { uploadProductImageToR2, deleteProductImageFromR2 } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    if (!(await checkAdminAccess(String(form.get("password") ?? ""))).ok)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const productId = String(form.get("product_id") ?? "");
    const variantId = String(form.get("variant_id") ?? "");
    const file = form.get("file");
    if (
      !productId ||
      !variantId ||
      !(file instanceof File) ||
      !file.size ||
      file.size > 8 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      return NextResponse.json(
        { message: "Select a JPG, PNG or WebP image up to 8 MB." },
        { status: 400 },
      );
    }
    const db = createSupabaseAdminClient();
    const { data: variant, error } = await db
      .from("product_variants")
      .select("id,dimension_image_url,products(name,slug,category)")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        {
          message:
            "Cannot load size images. Check that the variant dimension image migration is applied.",
        },
        { status: 503 },
      );
    const product = Array.isArray(variant?.products)
      ? variant.products[0]
      : variant?.products;
    if (!variant || !product)
      return NextResponse.json(
        { message: "Specification not found for this product." },
        { status: 404 },
      );
    const imageUrl = await uploadProductImageToR2({
      file,
      productName: product.name,
      productSlug: product.slug,
      category: product.category,
      imageSlot: `variant-${variant.id}`,
    });
    if (!imageUrl) throw new Error("Image upload failed.");
    const { data: saved, error: saveError } = await db
      .from("product_variants")
      .update({ dimension_image_url: imageUrl })
      .eq("id", variantId)
      .eq("product_id", productId)
      .select("id")
      .maybeSingle();
    if (saveError || !saved) {
      await deleteProductImageFromR2(imageUrl).catch(() => {});
      return NextResponse.json(
        { message: "Could not save the size image. Please retry." },
        { status: 500 },
      );
    }
    // Previous objects are retained so in-flight readers never lose their image.
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json(
      { message: "Size image upload failed. Please retry." },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    if (!(await checkAdminAccess(body?.password)).ok)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (
      typeof body.productId !== "string" ||
      typeof body.variantId !== "string"
    )
      return NextResponse.json(
        { message: "Product and specification are required." },
        { status: 400 },
      );
    const { data, error } = await createSupabaseAdminClient()
      .from("product_variants")
      .update({ dimension_image_url: null })
      .eq("id", body.variantId)
      .eq("product_id", body.productId)
      .select("id")
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { message: "Could not remove the size image." },
        { status: 500 },
      );
    if (!data)
      return NextResponse.json(
        { message: "Specification not found." },
        { status: 404 },
      );
    return NextResponse.json({ imageUrl: null });
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
}
