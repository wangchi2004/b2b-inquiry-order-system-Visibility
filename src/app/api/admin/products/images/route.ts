import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin";
import { deleteProductImageFromR2, uploadProductImageToR2 } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Product } from "@/lib/types";

const imageFields = ["image_url", "image_url_2", "image_url_3"] as const;

type ImageField = (typeof imageFields)[number];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = readString(formData.get("password"));
    const access = checkAdminAccess(password);

    if (!access.ok) {
      return NextResponse.json(
        { message: "Unauthorized admin request." },
        { status: 401 }
      );
    }

    const productId = readString(formData.get("product_id"));
    const imageField = readImageField(formData.get("image_field"));
    const file = formData.get("file");

    if (!productId || !imageField) {
      return NextResponse.json(
        { message: "Product and image field are required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "Image file is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { message: productError?.message ?? "Product not found." },
        { status: 404 }
      );
    }

    const productRow = product as Product;
    const imageUrl = await uploadProductImageToR2({
      file,
      productName: productRow.name,
      productSlug: productRow.slug,
      category: productRow.category,
      imageSlot: imageSlotFromField(imageField)
    });

    if (!imageUrl) {
      return NextResponse.json(
        { message: "No image was uploaded." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({
        [imageField]: imageUrl
      })
      .eq("id", productId);

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to upload image."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const requestBody = (await request.json().catch(() => null)) as
      | {
          password?: string;
          productId?: string;
          imageField?: string;
        }
      | null;
    const access = checkAdminAccess(requestBody?.password);

    if (!access.ok) {
      return NextResponse.json(
        { message: "Unauthorized admin request." },
        { status: 401 }
      );
    }

    const productId = requestBody?.productId?.trim() ?? "";
    const imageField = readImageField(requestBody?.imageField ?? null);

    if (!productId || !imageField) {
      return NextResponse.json(
        { message: "Product and image field are required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("image_url,image_url_2,image_url_3")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { message: productError?.message ?? "Product not found." },
        { status: 404 }
      );
    }

    const imageUrl = (product as Pick<Product, ImageField>)[imageField];
    const { error: updateError } = await supabase
      .from("products")
      .update({
        [imageField]: null
      })
      .eq("id", productId);

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message },
        { status: 500 }
      );
    }

    try {
      await deleteProductImageFromR2(imageUrl);
    } catch (error) {
      console.warn("Failed to delete product image from R2", error);
    }

    return NextResponse.json({
      imageUrl: null
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to delete image."
      },
      { status: 500 }
    );
  }
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readImageField(value: FormDataEntryValue | null): ImageField | null {
  const text = readString(value);

  return imageFields.includes(text as ImageField) ? (text as ImageField) : null;
}

function imageSlotFromField(imageField: ImageField) {
  if (imageField === "image_url") {
    return "main" as const;
  }

  if (imageField === "image_url_2") {
    return "secondary-1" as const;
  }

  return "secondary-2" as const;
}
