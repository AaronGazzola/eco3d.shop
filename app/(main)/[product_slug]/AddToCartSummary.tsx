export function AddToCartSummary() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Summary</h2>
      <div>
        <p>
          <strong>Size:</strong> siz
        </p>
        <p>
          <strong>Colors:</strong> colors
        </p>
      </div>
      <div>
        <p>
          <strong>Top Left:</strong> topLef
        </p>
        <p>
          <strong>Top Right:</strong> topRight
        </p>
        <p>
          <strong>Bottom Left:</strong> bottomLef
        </p>
        <p>
          <strong>Bottom Right:</strong> bottomRigh
        </p>
      </div>
    </div>
  );
}
