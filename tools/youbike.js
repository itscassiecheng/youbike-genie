import { z } from "zod";
import { defineTool } from "../utils/func-tool.js";

const YOUBIKE_API =
  "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";

async function getNearbyYoubike({
  area,
  available_amount = 0,
  limit = 3,
}) {
  const res = await fetch(YOUBIKE_API);
  const data = await res.json();

  return data
    .filter((s) => s.act === "1")
    .map((s) => ({
      name: s.sna.replace(/^YouBike2\.0_/, ""),
      area: s.sarea,
      address: s.ar,
      available_rent: s.available_rent_bikes,
      available_return: s.available_return_bikes,
      total: s.Quantity,
    }))
    .filter(
      (s) => s.area === area && s.available_rent >= available_amount,
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export const youbikeTool = defineTool({
  name: "get_youbike_by_area",
  description: "取得指定區域可租借的 YouBike 站點",
  fn: getNearbyYoubike,
  parameters: z.object({
    area: z.string().describe("區域"),
    available_amount: z
      .number()
      .default(0)
      .describe("至少可租借車輛數，預設 0"),
    limit: z.number().default(3).describe("回傳筆數上限，預設 3"),
  }),
});