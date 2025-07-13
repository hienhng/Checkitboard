import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Target, Trophy } from "lucide-react";

interface TestModeProps {
  cards: Array<{
    id: number;
    word: { word: string };
    definition: { 
      studentDefinition: string;
      correctDefinition?: string;
      showCorrectDefinition?: boolean;
      submission: { list: { title: string } }
    };
    learned: boolean;
  }>;
  onSessionComplete?: (stats: any) => void;
}

export function TestMode({ cards, onSessionComplete }: TestModeProps) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Target className="h-16 w-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Test Mode</h3>
        <p className="text-gray-600 mb-4">
          Coming soon! This will include comprehensive testing with multiple question types.
        </p>
        <Badge variant="secondary">Feature in Development</Badge>
      </CardContent>
    </Card>
  );
}