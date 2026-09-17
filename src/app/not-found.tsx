"use client";
import "./globals.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import Title from "@/components/atoms/Title";
import Text from "@/components/atoms/Text";
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false },
);

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen ds-bg-alt">
      <Player
        autoplay
        loop
        src="/assets/lotties/not-found-potto.json"
        className="w-70 h-70"
      />
      <div className="flex flex-col justify-center items-center">
        <Title>404 - الصفحة غير موجودة</Title>
        <Text>يبدو أنك دخلت على مسار غير موجود</Text>
        <Link href="/">
          <Button variant="primary" size="md" className="mt-4">
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
