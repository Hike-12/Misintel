import { VerificationStep, AnalysisResult } from './types';

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

export function buildVerificationFlow(data: any, inputContent: string): VerificationStep[] {
  const steps: VerificationStep[] = [];

  // Step 1: Input received
  steps.push({
    id: "1",
    label: "Input Received",
    status: "success",
    details:
      inputContent.substring(0, 100) +
      (inputContent.length > 100 ? "..." : ""),
    timestamp: Date.now(),
  });

  // Step 2: News API Check
  if (data.newsResults && data.newsResults.length > 0) {
    steps.push({
      id: "2",
      label: "Recent News Check",
      status: "success",
      details: `Found ${data.newsResults.length} recent articles from trusted sources`,
      sources: data.newsResults.slice(0, 3).map((article: any) => ({
        url: article.url,
        title: article.title || article.source?.name || "News Article",
      })),
      timestamp: Date.now() + 100,
    });
  } else {
    steps.push({
      id: "2",
      label: "Recent News Check",
      status: "warning",
      details: "No recent news articles found",
      timestamp: Date.now() + 100,
    });
  }

  // Step 3: Fact Check Database (improved)
  const parseClaimRating = (claim: any) => {
    const review =
      (claim.claimReview && claim.claimReview[0]) ||
      (claim.reviewers && claim.reviewers[0]) ||
      null;
    let ratingText = "";

    if (review) {
      ratingText =
        review.textualRating ||
        "" ||
        (review.reviewRating && review.reviewRating.alternateName) ||
        review.title ||
        "" ||
        review.description ||
        "" ||
        "";
    }

    ratingText = ratingText || claim.textualRating || claim.rating || "";
    return ratingText.toString().trim().toLowerCase();
  };

  const extractClaimUrls = (claim: any) => {
    const review =
      (claim.claimReview && claim.claimReview[0]) ||
      (claim.reviewers && claim.reviewers[0]) ||
      null;
    const urls: string[] = [];
    if (review) {
      if (review.url) urls.push(review.url);
      if (review.publisher && review.publisher.url)
        urls.push(review.publisher.url);
      if (review.publisher && review.publisher.site)
        urls.push(review.publisher.site);
    }
    if (claim.url) urls.push(claim.url);
    return urls.filter(Boolean);
  };

  const NEGATIVE_RE =
    /\b(false|misleading|pants on fire|fabricated|hoax|incorrect|not true|debunked|falsehood|misrepresen|untrue)\b/i;
  const POSITIVE_RE =
    /\b(true|accurate|correct|verified|substantiated|true claim|confirmed|supported)\b/i;

  if (data.factCheckResults && data.factCheckResults.length > 0) {
    let hasNegative = false;
    let hasPositive = false;

    data.factCheckResults.forEach((claim: any) => {
      const rt = parseClaimRating(claim);
      if (!rt) {
        console.debug("FactCheck claim (no rating found):", claim);
      } else {
        if (NEGATIVE_RE.test(rt)) hasNegative = true;
        if (POSITIVE_RE.test(rt)) hasPositive = true;
      }
    });

    let status: VerificationStep["status"] = "warning";
    if (hasNegative && !hasPositive) status = "error";
    else if (hasPositive && !hasNegative) status = "success";
    else status = "warning";

    steps.push({
      id: "3",
      label: "Fact Check Database",
      status,
      details: `Found ${data.factCheckResults.length} related fact-check(s)`,
      sources: data.factCheckResults
        .flatMap((c: any) => extractClaimUrls(c))
        .slice(0, 3)
        .map((u: string) => ({ url: u, title: u })),
      timestamp: Date.now() + 200,
    });
  } else {
    steps.push({
      id: "3",
      label: "Fact Check Database",
      status: "warning",
      details: "No existing fact-checks found",
      timestamp: Date.now() + 200,
    });
  }

  // Step 4: Custom Search Verification
  if (data.customSearchResults && data.customSearchResults.length > 0) {
    steps.push({
      id: "4",
      label: "Search Verification",
      status: "success",
      details: `Analyzed ${data.customSearchResults.length} search results`,
      sources: data.customSearchResults.slice(0, 3).map((item: any) => ({
        url: item.link,
        title: item.title || item.source || "Search Result",
      })),
      timestamp: Date.now() + 300,
    });
  } else {
    steps.push({
      id: "4",
      label: "Search Verification",
      status: "warning",
      details: "Limited search results available",
      timestamp: Date.now() + 300,
    });
  }

  // Step 5: URL Safety Check
  if (data.safetyCheck) {
    steps.push({
      id: "5",
      label: "URL Safety Check",
      status: data.safetyCheck.safe ? "success" : "error",
      details: data.safetyCheck.safe
        ? "No security threats detected"
        : `${data.safetyCheck.threats?.length || 0} security threats found`,
      timestamp: Date.now() + 400,
    });
  }

  // Step 6: AI Analysis
  steps.push({
    id: "6",
    label: "AI Analysis",
    status:
      data.confidence >= 80
        ? "success"
        : data.confidence >= 60
        ? "warning"
        : "error",
    details: `Confidence: ${data.confidence}% - ${
      data.isFake ? "Likely False" : "Likely True"
    }`,
    timestamp: Date.now() + 500,
  });

  // Step 7: Final Verdict
  steps.push({
    id: "7",
    label: "Final Verdict",
    status: data.isFake ? "error" : "success",
    details: data.summary,
    sources:
      data.sources?.map((url: string) => ({
        url,
        title: new URL(url).hostname,
      })) || [],
    timestamp: Date.now() + 600,
  });

  return steps;
}
