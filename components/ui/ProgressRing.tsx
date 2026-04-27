import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;   // 0–1, clamped for visual
  color: string;
  label: string;
  labelSize?: number;
}

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  label,
  labelSize,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="#1f1f1f" strokeWidth={strokeWidth}
        />
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color, fontSize: labelSize ?? size * 0.2, fontWeight: "700" }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
