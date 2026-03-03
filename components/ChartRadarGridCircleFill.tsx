import React from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { subject: "Discovery", A: 120, fullMark: 150 },
  { subject: "Variety", A: 98, fullMark: 150 },
  { subject: "Intensity", A: 86, fullMark: 150 },
  { subject: "Longevity", A: 99, fullMark: 150 },
  { subject: "Energy", A: 85, fullMark: 150 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ChartRadarGridCircleFill({
  data = chartData,
}: {
  data?: any[];
}) {
  return (
    <Card className="bg-transparent border-none shadow-none text-foreground">
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-xl font-bold">Artist DNA</CardTitle>
        <CardDescription className="text-foreground/40">
          Metric breakdown for this rising star
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          c
          onfig={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis
              dataKey="subject"
              t
              ick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            />
            <PolarGrid radialL ines={false} stroke="rgba(255,255,255,0.1)" />
            <Radar
              dataKey="A"
              fill="rgba(59, 130, 246, 0.5)"
              fillO
              pacity={0.6}
              stroke="#3b82f6"
              strokeW
              idth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
