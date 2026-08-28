import { NextResponse } from "next/server";
import {
  getValidPinterestToken,
  PinterestNotConnectedError,
} from "../../../lib/server/pinterestAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, title, caption, boardId, link } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }
    if (!boardId) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    const token = await getValidPinterestToken();

    const pinRes = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title: title || undefined,
        description: caption || undefined,
        link: link || undefined,
        media_source: {
          source_type: "image_url",
          url: imageUrl,
        },
      }),
    });

    if (!pinRes.ok) {
      const text = await pinRes.text();
      return NextResponse.json(
        { error: `Pinterest publish failed: ${pinRes.status} ${text}` },
        { status: 502 }
      );
    }

    const pin = await pinRes.json();
    return NextResponse.json({ success: true, post: pin });
  } catch (err: any) {
    if (err instanceof PinterestNotConnectedError) {
      return NextResponse.json(
        { error: "not_connected", message: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
