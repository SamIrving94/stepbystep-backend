'use client';

import React, { useState } from 'react';
import { useInstructionProcessor } from '../hooks/use-instruction-processor';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Play, AlertTriangle, Clock, ChefHat, Wrench } from 'lucide-react';

export function InstructionProcessorExample() {
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cooking');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  
  const {
    loadingState,
    processedInstructions,
    processInstructions,
    reset,
    clearError,
  } = useInstructionProcessor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rawText.trim()) {
      return;
    }

    await processInstructions({
      rawText: rawText.trim(),
      title: title || 'Untitled Instructions',
      category,
      difficulty,
      preferences: {
        readingLevel: 'simple',
        stepGranularity: 'detailed',
        includeWarnings: true,
      },
    });
  };

  const handleReset = () => {
    setRawText('');
    setTitle('');
    setCategory('cooking');
    setDifficulty('beginner');
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Instruction Processor</h1>
        <p className="text-muted-foreground">
          Transform complex instructions into accessible, step-by-step guidance
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Classic Chocolate Chip Cookies"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="cooking">Cooking</option>
                  <option value="baking">Baking</option>
                  <option value="diy">DIY</option>
                  <option value="assembly">Assembly</option>
                  <option value="crafts">Crafts</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Instructions</label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your complex instructions here..."
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loadingState.isLoading || !rawText.trim()}
                className="flex items-center gap-2"
              >
                {loadingState.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Process Instructions
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                disabled={loadingState.isLoading}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {loadingState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {loadingState.error}
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2" 
              onClick={clearError}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {processedInstructions && (
        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{processedInstructions.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{processedInstructions.category}</Badge>
                    <Badge variant="outline">{processedInstructions.difficulty}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {processedInstructions.totalTime}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Ingredients */}
          {processedInstructions.ingredients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Ingredients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {processedInstructions.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tools */}
          {processedInstructions.tools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Tools Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {processedInstructions.tools.map((tool, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      {tool}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {processedInstructions.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Safety Warnings:</div>
                <ul className="space-y-1">
                  {processedInstructions.warnings.map((warning, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedInstructions.steps.map((step) => (
                  <div key={step.stepNumber} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">{step.instruction}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.estimatedTime}
                          </span>
                          {step.tips && (
                            <span className="text-blue-600">💡 {step.tips}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 