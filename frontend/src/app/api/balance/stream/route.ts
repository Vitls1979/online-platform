import { NextResponse } from "next/server";

import { getBalance, updateBalance } from "@/data/balance";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  let interval: NodeJS.Timeout;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const snapshot = getBalance();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "balance",
            data: {
              available: snapshot.available,
              pending: snapshot.pending,
              updatedAt: snapshot.updatedAt,
            },
          })}\n\n`,
        ),
      );

      interval = setInterval(() => {
        const payload = updateBalance();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "balance",
              data: {
                available: payload.available,
                pending: payload.pending,
                updatedAt: payload.updatedAt,
              },
            })}\n\n`,
          ),
        );

        if (payload.transaction) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "transaction",
                data: payload.transaction,
              })}\n\n`,
            ),
          );
        }
      }, 5000);

      const close = () => {
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
