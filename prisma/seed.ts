import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ids = {
  threadLedStrip: "33333333-3333-4333-8333-333333333333",
  threadPowerAdapter: "44444444-4444-4444-8444-444444444444",
  threadMasks: "55555555-5555-4555-8555-555555555555",
  communicationLedInquiry: "66666666-6666-4666-8666-666666666666",
  communicationLedReply: "77777777-7777-4777-8777-777777777777",
  communicationSamplePaid: "88888888-8888-4888-8888-888888888888",
  communicationMasksInquiry: "99999999-9999-4999-8999-999999999999",
  quoteLedStrip: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.quote.deleteMany({
      where: {
        id: {
          in: [ids.quoteLedStrip],
        },
      },
    });

    await tx.communication.deleteMany({
      where: {
        id: {
          in: [
            ids.communicationLedInquiry,
            ids.communicationLedReply,
            ids.communicationSamplePaid,
            ids.communicationMasksInquiry,
          ],
        },
      },
    });

    await tx.businessThread.deleteMany({
      where: {
        id: {
          in: [ids.threadLedStrip, ids.threadPowerAdapter, ids.threadMasks],
        },
      },
    });

    await tx.businessThread.create({
      data: {
        id: ids.threadLedStrip,
        title: "Reflective LED Trim",
        business_state: "NEGOTIATION",
        attention_state: "FOLLOW_UP",
        company_name: "ABC Trading",
        country: "United States",
        source_email: "john@abctrading.example",
        email_domain: "abctrading.example",
        identity_cluster_key: "abctrading.example::abc-trading",
        context: {
          current_intent: "Revise Quote",
          current_need: "Customer is comparing the USD 2.18 quote against a USD 2.10 target and needs a commercially workable revision.",
          next_best_action: "Revise quote with a 5,000 pcs price break and confirm sample lead time today.",
          action_reason: "The deal is still active, but price pressure is now the blocker to moving into sample approval.",
          deadline: "Reply today",
          quantity: "3,000 pcs trial / 5,000 pcs price break",
          moq: "5,000 pcs for USD 2.05",
          incoterm: "FOB Ningbo",
          target_price: "USD 2.10/pc",
          sample_status: "Pre-production samples possible in 7 days",
          risk_level: "Medium",
          priority_reason: "Warm repeat buyer with a concrete price target and active Q4 program.",
          thread_summary: "This thread has moved from quote sent into price negotiation for a reflective running jacket trim program.",
          key_requirements: [
            "Warm white LED strip trim",
            "120cm length",
            "Logo label packaging",
            "Washable construction",
          ],
          blockers: ["Target price is below current 3,000 pcs quote"],
          decision_signals: ["Target USD 2.10", "MOQ 5000", "Reply today"],
        },
        context_updated_at: new Date("2026-06-28T09:30:00.000Z"),
        last_active_at: new Date("2026-06-28T09:30:00.000Z"),
        communications: {
          create: [
            {
              id: ids.communicationLedInquiry,
              source: "EMAIL",
              message_body:
                "Hi, we are developing a reflective running jacket line for Q4. Please quote custom washable LED strip trims, 120cm length, warm white, with logo label packaging. Initial trial order is 3,000 pcs, target FOB Ningbo under USD 2.10/pc.",
              is_from_customer: true,
              timestamp: new Date("2026-06-27T02:18:00.000Z"),
              extracted_signals: {
                advancement_context: {
                  current_intent: "Need Quote",
                  decision_signals: ["Target USD 2.10", "FOB Ningbo", "3000 pcs"],
                },
              },
            },
            {
              id: ids.communicationLedReply,
              source: "EMAIL",
              message_body:
                "Hi John, thanks for the details. We can support the washable LED strip trim for the running jacket program. Based on 3,000 pcs, our preliminary FOB Ningbo price is USD 2.18/pc with logo label packaging. If you can accept a 5,000 pcs MOQ, we can revise to USD 2.05/pc and arrange pre-production samples within 7 days.",
              is_from_customer: false,
              timestamp: new Date("2026-06-27T06:42:00.000Z"),
            },
          ],
        },
        quotes: {
          create: [
            {
              id: ids.quoteLedStrip,
              parameters: {
                input: {
                  product_description: "Custom washable LED strip trim for running jackets",
                },
                quote: {
                  product_name: "Reflective LED Trim",
                  plans: {
                    plan_a: {
                      final_price: 2.18,
                    },
                  },
                },
              },
              status: "SENT",
            },
          ],
        },
      },
    });

    await tx.businessThread.create({
      data: {
        id: ids.threadPowerAdapter,
        title: "Heated Vest Adapter Sample",
        business_state: "SAMPLING",
        attention_state: "WAITING",
        company_name: "ABC Trading",
        country: "United States",
        source_email: "john@abctrading.example",
        email_domain: "abctrading.example",
        identity_cluster_key: "abctrading.example::abc-trading",
        related_thread_id: ids.threadLedStrip,
        context: {
          current_intent: "Sampling",
          current_need: "Sample fee is paid; the next value is execution visibility, not another quote.",
          next_best_action: "Confirm receipt and update DHL shipment plan for 5 adapter samples.",
          action_reason: "Customer has already paid, so the thread should stay in waiting/execution mode until shipment feedback is available.",
          deadline: "Ship with vest samples",
          quantity: "5 pcs adapters",
          moq: null,
          incoterm: null,
          target_price: null,
          sample_status: "Sample fee paid",
          risk_level: "Low",
          priority_reason: "Payment confirmed; operational follow-through protects trust for the next bulk decision.",
          thread_summary: "This thread is in sampling execution after customer paid the adapter sample fee.",
          key_requirements: ["USB-C power adapter", "Black size M vest samples", "Ship by DHL"],
          blockers: ["Need payment receipt confirmation", "Need DHL plan"],
          decision_signals: ["Sample Paid", "5 pcs", "Need DHL"],
        },
        context_updated_at: new Date("2026-06-26T14:10:00.000Z"),
        last_active_at: new Date("2026-06-26T14:10:00.000Z"),
        communications: {
          create: [
            {
              id: ids.communicationSamplePaid,
              source: "WHATSAPP",
              message_body:
                "Hi, we have paid the sample fee for the USB-C power adapter used with the heated vest sample set. Please confirm receipt and ship 5 pcs adapters together with the black size M vest samples by DHL.",
              is_from_customer: true,
              timestamp: new Date("2026-06-26T14:10:00.000Z"),
              extracted_signals: {
                advancement_context: {
                  current_intent: "Sampling",
                  decision_signals: ["Sample Paid", "5 pcs", "Need DHL"],
                },
              },
            },
          ],
        },
      },
    });

    await tx.businessThread.create({
      data: {
        id: ids.threadMasks,
        title: "Hospital Tender Masks",
        business_state: "NEED_QUOTE",
        attention_state: "ACTION_NEEDED",
        company_name: "XYZ Medical",
        country: "United Kingdom",
        source_email: "emma@xyzmedical.example",
        email_domain: "xyzmedical.example",
        identity_cluster_key: "xyzmedical.example::xyz-medical",
        context: {
          current_intent: "Need Quote",
          current_need: "Customer needs a same-day tender quote with compliance, packaging, lead time, and freight details.",
          next_best_action: "Generate full tender quotation today with EXW/FOB options, documents, and air freight estimate.",
          action_reason: "The customer has a hard tender deadline and all missing data blocks submission.",
          deadline: "Quote today",
          quantity: "100,000 pcs",
          moq: null,
          incoterm: "EXW / FOB",
          target_price: "Best price requested",
          sample_status: null,
          risk_level: "High",
          priority_reason: "Large urgent tender with hard deadline and compliance requirements.",
          thread_summary: "This is an urgent hospital tender quotation thread waiting for a complete commercial response.",
          key_requirements: [
            "BFE >= 95%",
            "CE/ISO documentation",
            "Air freight to London",
            "Private label packaging",
            "First shipment within 10 days",
          ],
          blockers: ["Need carton dimensions", "Need freight estimate", "Need document availability"],
          decision_signals: ["Quote today", "100000 pcs", "Need CE/ISO"],
        },
        context_updated_at: new Date("2026-06-29T03:25:00.000Z"),
        last_active_at: new Date("2026-06-29T03:25:00.000Z"),
        communications: {
          create: [
            {
              id: ids.communicationMasksInquiry,
              source: "EMAIL",
              message_body:
                "Urgent request: we need a quote today for 100,000 pcs disposable surgical masks for hospital tender submission. Please include 3-ply non-woven fabric specification, BFE >= 95%, earloop type, nose wire material, carton dimensions, CE/ISO documentation availability, production lead time, air freight estimate to London, and best EXW/FOB price. The first shipment must leave China within 10 days if approved. Please also advise whether private label packaging can be ready for the first batch.",
              is_from_customer: true,
              timestamp: new Date("2026-06-29T03:25:00.000Z"),
              extracted_signals: {
                advancement_context: {
                  current_intent: "Need Quote",
                  decision_signals: ["Quote today", "100000 pcs", "Need CE/ISO"],
                },
              },
            },
          ],
        },
      },
    });
  });
}

main()
  .then(async () => {
    console.log("Seed data created successfully.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
