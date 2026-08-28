import { NextResponse } from "next/server";
import {
  getValidPinterestToken,
  PinterestNotConnectedError,
} from "../../../../lib/server/pinterestAuth";

export async function GET() {
  try {
    const token = await getValidPinterestToken();

    const res = await fetch(
      "https://api.pinterest.com/v5/boards?page_size=100",
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Couldn't load boards from Pinterest: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const boards = (data.items ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }));

    return NextResponse.json({ boards });
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
