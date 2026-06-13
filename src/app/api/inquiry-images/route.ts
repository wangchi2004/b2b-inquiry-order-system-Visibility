import { NextResponse } from "next/server";
import { uploadInquiryImageToR2 } from "@/lib/r2";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        message: "Invalid image upload request."
      },
      {
        status: 400
      }
    );
  }

  const file = formData.get("file");
  const email = formData.get("email");
  const slot = Number(formData.get("slot") ?? 1);

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        message: "Image file is required."
      },
      {
        status: 400
      }
    );
  }

  try {
    const imageUrl = await uploadInquiryImageToR2({
      file,
      email: typeof email === "string" ? email : null,
      slot
    });

    return NextResponse.json({
      imageUrl
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload inquiry image."
      },
      {
        status: 500
      }
    );
  }
}
