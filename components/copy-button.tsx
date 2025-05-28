"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/meeting-utils";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  size = "sm",
  className,
}: CopyButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);

    if (success) {
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Text has been copied to clipboard",
      });

      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy text. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size}
      className={className}
      title={`Copy ${label !== "Copy" && label.toLowerCase()}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {size !== "sm" && (
        <span className="ml-2">{copied ? "Copied!" : label}</span>
      )}
    </Button>
  );
}
