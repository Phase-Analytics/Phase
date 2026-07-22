import { StyleSheet, View } from "react-native";

import TimeseriesChart, {
  type TimeseriesPoint,
} from "@/components/charts/timeseries-chart";

export function ChartBlock({
  data,
  height = 200,
}: {
  data: TimeseriesPoint[];
  height?: number;
}) {
  return (
    <View style={[styles.wrap, { height }]}>
      <TimeseriesChart
        dark
        data={data}
        dom={{
          matchContents: true,
          style: { width: "100%", height },
        }}
        height={height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
});
