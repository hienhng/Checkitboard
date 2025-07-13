import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Trophy } from "lucide-react";

interface MatchModeProps {
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

export function MatchMode({ cards, onSessionComplete }: MatchModeProps) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Gamepad2 className="h-16 w-16 mx-auto text-orange-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Match Mode</h3>
        <p className="text-gray-600 mb-4">
          Coming soon! Drag and drop words to their matching definitions.
        </p>
        <Badge variant="secondary">Feature in Development</Badge>
      </CardContent>
    </Card>
  );
}