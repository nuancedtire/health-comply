export type ClassificationType = 'match' | 'suggestion' | 'irrelevant';

export type ClassificationResult = {
    type: ClassificationType;
    confidence: number;
    
    // For matches
    matchedControlId?: string;
    matchedControlTitle?: string;
    
    // For suggestions
    suggestedControlTitle?: string;
    suggestedQsId?: string;
    
    reasoning: string;
    detectedTopics?: string[];
    analyzedAt: string;
};
