// 认证页面布局：居中卡片
import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="size-6" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold">AI 销售顾问助手</div>
          <div className="text-xs text-muted-foreground">国际教育语言培训</div>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
