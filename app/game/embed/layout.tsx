// Transparency belongs to the route, not to the page component. Held in the page it died with the
// page: an exception unmounted the component, its cleanup restored the app background, and a failed
// overlay painted an opaque panel over the stream. A layout outlives the page it renders, so the frame
// stays transparent through an error, a boundary, and whatever renders in the page's place.
export default function GameEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{'html,body{background:transparent}'}</style>
      {children}
    </>
  )
}
