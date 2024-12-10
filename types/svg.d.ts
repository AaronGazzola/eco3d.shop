// types/svg.d.ts
declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}
