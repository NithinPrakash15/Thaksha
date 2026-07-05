import { prisma } from "@/lib/prisma";

type CreateOrderBody = {
  name: string;
  email: string;
  address: string;
  lines: Array<{ slug: string; quantity: number }>;
  total: number;
};

export async function post(request: Request) {
  const body = (await request.json()) as CreateOrderBody;
  const { name, email, address, lines, total } = body;

  if (!name || !email || !address) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  const productRecords = await prisma.product.findMany({
    where: { slug: { in: lines.map((l) => l.slug) } },
    select: { id: true, slug: true, priceCents: true },
  });

  const productBySlug = new Map(productRecords.map((p) => [p.slug, p] as const));

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      email,
      totalCents: Math.round(total * 100),
      status: "PENDING",
      address: {
        create: {
          userId: user.id,
          name,
          line1: address,
          city: "",
          country: "",
          postal: "",
          region: null,
        },
      },
      items: {
        create: lines.map((line) => {
          const product = productBySlug.get(line.slug);
          if (!product) throw new Error(`Unknown product slug: ${line.slug}`);
          return {
            productId: product.id,
            quantity: line.quantity,
            priceCents: product.priceCents,
          };
        }),
      },
    },
    select: { id: true, createdAt: true, totalCents: true },
  });

  return new Response(
    JSON.stringify({
      id: order.id,
      createdAt: order.createdAt,
      totalCents: order.totalCents,
    }),
    { headers: { "content-type": "application/json" } },
  );
}
