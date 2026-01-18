import { ClassificationResult } from '@/types/classification';

export const classifyDocument = async (
  _documentText: string, 
  fileName: string
): Promise<ClassificationResult> => {
  // Mock AI Latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock Logic based on filename keywords
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes('holiday') || lowerName.includes('party') || lowerName.includes('receipt')) {
    return {
      type: 'irrelevant',
      confidence: 15,
      reasoning: "Document content appears to be personal or unrelated to compliance controls.",
      analyzedAt: new Date().toISOString()
    };
  }

  if (lowerName.includes('fire') || lowerName.includes('safety')) {
    // High confidence match
    return {
      type: 'match',
      confidence: 92,
      matchedControlTitle: "Fire Safety Training", // In real app, this would come with ID
      // We'd need to actually look up controls, but for mock we'll just return titles
      // and let the UI/Backend handle the mapping if we were doing real ID matching.
      // For now, let's assume we return a matchedControlId if we found one.
      matchedControlId: 'mock-fire-control-id', 
      reasoning: "Document explicitly mentions 'Fire Safety' and 'Training Certificate'.",
      detectedTopics: ['Fire Safety', 'Training'],
      analyzedAt: new Date().toISOString()
    };
  }

  if (lowerName.includes('meeting') || lowerName.includes('minutes')) {
    // Suggestion
    return {
      type: 'suggestion',
      confidence: 65,
      suggestedControlTitle: "Staff Meeting Minutes",
      suggestedQsId: "safe.governance",
      reasoning: "Document appears to be meeting minutes, but no specific 'Staff Meeting' control was found. Suggest creating one.",
      detectedTopics: ['Meeting', 'Governance'],
      analyzedAt: new Date().toISOString()
    };
  }

  // Default to suggestion
  return {
    type: 'suggestion',
    confidence: 45,
    suggestedControlTitle: "General Document Review",
    reasoning: "Document content is ambiguous. Suggest manual review.",
    analyzedAt: new Date().toISOString()
  };
};
