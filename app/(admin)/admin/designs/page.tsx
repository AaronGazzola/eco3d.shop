"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Simple3DViewer } from "@/components/3d/Simple3DViewer";
import { usePendingDesigns, useApproveDesign, useRejectDesign } from "./page.hooks";
import type { ModelData } from "@/app/layout.types";

export default function AdminDesignReviewPage() {
  const { data: designs, isLoading } = usePendingDesigns();
  const approveDesign = useApproveDesign();
  const rejectDesign = useRejectDesign();

  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const handleApprove = (designId: string) => {
    approveDesign.mutate({ designId, feedback: feedbackMap[designId] });
  };

  const handleReject = (designId: string) => {
    const feedback = feedbackMap[designId];
    if (!feedback) {
      alert("Please provide feedback for rejection");
      return;
    }
    rejectDesign.mutate({ designId, feedback });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Design Review</h1>
        <p className="text-gray-600">Review and approve submitted designs</p>
      </div>

      {isLoading ? (
        <p>Loading pending designs...</p>
      ) : designs && designs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {designs.map((design) => (
            <Card key={design.id}>
              <CardHeader>
                <CardTitle>{design.title}</CardTitle>
                <CardDescription>
                  by {(design.creator as any)?.display_name || "Unknown"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                  <Simple3DViewer
                    modelData={design.model_data as ModelData}
                    height="100%"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    {design.description || "No description"}
                  </p>
                </div>
                <div>
                  <Label htmlFor={`feedback-${design.id}`}>Feedback (optional for approve, required for reject)</Label>
                  <Textarea
                    id={`feedback-${design.id}`}
                    placeholder="Add your feedback..."
                    value={feedbackMap[design.id] || ""}
                    onChange={(e) =>
                      setFeedbackMap({ ...feedbackMap, [design.id]: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleReject(design.id)}
                  disabled={rejectDesign.isPending}
                >
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleApprove(design.id)}
                  disabled={approveDesign.isPending}
                >
                  Approve
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No pending designs to review</p>
        </div>
      )}
    </div>
  );
}
