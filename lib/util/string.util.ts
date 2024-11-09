export function maskEmail(
  email?: string | null,
  firstPartStars = 5,
  secondPartStars = 4,
): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  const [domainName, domainExt] = domain.split(".");

  const maskedLocal =
    local[0] + "*".repeat(firstPartStars) + local[local.length - 1];
  const maskedDomainName =
    domainName[0] +
    "*".repeat(secondPartStars) +
    domainName[domainName.length - 1];

  return `${maskedLocal}@${maskedDomainName}.${domainExt}`;
}
