import { TouchableOpacity, TouchableOpacityProps, Text, ActivityIndicator } from "react-native";
import { cn } from "~/lib/utils";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  loading?: boolean;
}

const variantStyles = {
  default: "bg-primary active:opacity-75",
  outline: "border border-border bg-transparent active:bg-secondary",
  ghost: "bg-transparent active:bg-secondary",
  destructive: "bg-destructive active:opacity-75",
};

const textStyles = {
  default: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
};

const sizeStyles = {
  default: "h-[52px] px-6",
  sm: "h-10 px-4",
  lg: "h-14 px-8",
};

const textSizeStyles = {
  default: "text-base",
  sm: "text-sm",
  lg: "text-lg",
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
        "flex-row items-center justify-center rounded-xl",
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
          color={variant === "default" || variant === "destructive" ? "#fff" : "#10b981"}
          className="mr-2"
        />
      )}
      {typeof children === "string" ? (
        <Text className={cn("font-bold tracking-tight", textSizeStyles[size], textStyles[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
