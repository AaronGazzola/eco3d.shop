const Footer = () => {
  return (
    <div className="h-[139px] flex flex-col justify-center items-center">
      <div className="flex ">
        {links.map((link, index) => (
          <>
            <a href={link.href} className="hover:underline">
              {link.name}
            </a>
            {index < links.length - 1 && (
              <span className="text-gray-500">•</span>
            )}
          </>
        ))}
      </div>
      <div className="text-[#DBDBDB] font-medium text-[16px] leading-[19.2px]">
        Copyright by Eco3D © 2025. All rights reserved
      </div>
    </div>
  );
};

const links = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Contact Us", href: "/contact" },
  { name: "FAQs", href: "/faqs" },
  { name: "Terms and conditions", href: "/terms" },
  { name: "Privacy", href: "/privacy" },
];

export default Footer;
