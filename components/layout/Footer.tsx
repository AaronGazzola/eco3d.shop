import configuration from "@/configuration";
import { Dot } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="w-full bg-gradient-to-r from-green-900 via-green-950 to-green-900 flex items-center justify-center text-gray-200 font-black text-sm shadow">
      <Link
        href={configuration.paths.faq}
        className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
      >
        FAQ
      </Link>
      <Dot />
      <Link
        href={configuration.paths.terms}
        className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
      >
        Terms
      </Link>
      <Dot />
      <Link
        href={configuration.paths.pricing}
        className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
      >
        Privacy
      </Link>
      <Dot />
      <Link
        href={configuration.paths.pricing}
        className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
      >
        Contact
      </Link>
    </div>
  );
};

export default Footer;
