import Image from "next/image";

export default function Advertisement() {
  return (
    <div className="relative w-[480px] h-[480px]">
      <Image
        src="/images/hero/advertisement.png"
        alt="Advertisement"
        fill
        className="object-cover"
      />
    </div>
  );
}
