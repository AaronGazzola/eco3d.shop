import configuration from "@/configuration";
import { Dot } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    // <div className="mt-[5rem] w-full bg-gradient-to-r from-green-900 via-green-950 to-green-900 flex items-center justify-center text-gray-200 font-black text-sm shadow">
    <div className="w-full bg-gradient-to-r from-green-900 via-green-950 to-green-900 flex items-center justify-center text-gray-200 font-black text-sm shadow relative flex-col">
      <div className="hidden md:absolute md:inset-0 md:flex items-center md:justify-end pr-2 font-normal">
        <span className="text-white">
          Copyright Apex Apps © {new Date().getFullYear()}
        </span>
      </div>
      <div className="flex-grow flex justify-center items-center">
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
          href={configuration.paths.privacy}
          className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
        >
          Privacy
        </Link>
        <Dot />
        <Link
          href={configuration.paths.contact}
          className="px-1 xs:px-3 sm:px-4 hover:bg-green-800 hover:text-gray-50"
        >
          Contact
        </Link>
      </div>
      <div className="md:absolute md:inset-0 md:flex items-center md:justify-end pr-2 font-normal flex-shrink-0">
        <span className="text-white">
          Copyright Apex Apps © {new Date().getFullYear()}
        </span>
      </div>
    </div>
  );
};

export default Footer;
