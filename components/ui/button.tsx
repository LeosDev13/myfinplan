import { TouchableOpacity, TouchableOpacityProps, Text, ActivityIndicator, View } from "react-native";
import { cn } from "~/lib/utils";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  loading?: boolean;
}

const variantStyles = {
  default: "bg-primary active:opacity-80",
  outline: "border border-input bg-background active:bg-accent",
  ghost: "active:bg-accent",
  destructive: "bg-destructive active:opacity-80",
};

const textStyles = {
  default: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
};

const sizeStyles = {
  default: "h-12 px-6",
  sm: "h-9 px-4",
  lg: "h-14 px-8",
};

export function Button({
  children,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(
        "flex-row items-center justify-center rounded-lg",
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && "opacity-50",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "default" ? "#fff" : "#000"}
          className="mr-2"
        />
      )}
      {typeof children === "string" ? (
        <Text className={cn("text-base font-semibold", textStyles[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
