export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  const [domainName, domainExt] = domain.split(".");

  const maskedLocal =
    local[0] + "_".repeat(local.length) + local[local.length - 1];
  const maskedDomainName = domainName;
  // domainName[0];
  // +
  // "_".repeat(secondPartStars) +
  // domainName[domainName.length - 1];

  return `${maskedLocal}@${maskedDomainName}.${domainExt}`;
}

export function camelCaseToFormattedString(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (char) => char.toUpperCase());
}
