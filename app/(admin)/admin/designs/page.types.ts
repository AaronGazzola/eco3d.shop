export type DesignReviewAction = "approve" | "reject";

export type ReviewFormData = {
  designId: string;
  action: DesignReviewAction;
  feedback?: string;
};
