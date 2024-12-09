"use client";

import useSupabase from "@/hooks/useSupabase";

export default function UploadDeleteImage() {
  const supabase = useSupabase();
  const handleUpload = async () => {
    const filePath = "/images/products/Digger/Aaron Set 2-4.jpg";
    const file = new File(
      [await fetch(`/public${filePath}`).then(res => res.blob())],
      "Aaron Set 2-4.jpg",
    );
    const { error } = await supabase.storage
      .from("product-images")
      .upload("Aaron Set 2-4.jpg", file, { upsert: true });
    if (error) {
      console.error("Upload Error:", error.message);
    } else {
      console.log("Upload Successful");
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.storage
      .from("product-images")
      .remove(["Aaron Set 2-4.jpg"]);
    if (error) {
      console.error("Delete Error:", error.message);
    } else {
      console.log("Delete Successful");
    }
  };

  return (
    <div>
      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
