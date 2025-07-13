import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Trophy } from "lucide-react";

interface SpellModeProps {
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

export function SpellMode({ cards, onSessionComplete }: SpellModeProps) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <CheckCircle className="h-16 w-16 mx-auto text-pink-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Spell Mode</h3>
        <p className="text-gray-600 mb-4">
          Coming soon! Type out definitions and words to test your spelling and recall.
        </p>
        <Badge variant="secondary">Feature in Development</Badge>
      </CardContent>
    </Card>
  );
}