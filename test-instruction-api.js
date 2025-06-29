// Test script for the Instruction Processing API
const testInstructions = {
  rawText: "Preheat the oven to 350°F (175°C). In a large mixing bowl, combine 2 cups of all-purpose flour, 1 cup of granulated sugar, 1 teaspoon of baking powder, and 1/2 teaspoon of salt. Whisk the dry ingredients together until well combined. In a separate bowl, cream together 1/2 cup of softened butter and 1/2 cup of brown sugar until light and fluffy. Beat in 1 large egg and 1 teaspoon of vanilla extract. Gradually add the dry ingredients to the wet ingredients, mixing until just combined. Stir in 1 cup of chocolate chips. Drop rounded tablespoons of dough onto an ungreased baking sheet, spacing them 2 inches apart. Bake for 10-12 minutes, or until the edges are golden brown. Let cool on the baking sheet for 5 minutes before transferring to a wire rack.",
  title: "Classic Chocolate Chip Cookies",
  category: "baking",
  difficulty: "beginner",
  preferences: {
    readingLevel: "simple",
    stepGranularity: "detailed",
    includeWarnings: true
  }
};

async function testInstructionAPI() {
  try {
    console.log('🧪 Testing Instruction Processing API...\n');
    
    const response = await fetch('http://localhost:3000/api/process-instructions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testInstructions),
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('✅ Success:', result.success);
    
    if (result.success && result.processedInstructions) {
      console.log('\n🎯 Processed Instructions:');
      console.log('Title:', result.processedInstructions.title);
      console.log('Category:', result.processedInstructions.category);
      console.log('Difficulty:', result.processedInstructions.difficulty);
      console.log('Total Time:', result.processedInstructions.totalTime);
      
      console.log('\n🥘 Ingredients:');
      result.processedInstructions.ingredients.forEach(ingredient => {
        console.log('  -', ingredient);
      });
      
      console.log('\n🔧 Tools:');
      result.processedInstructions.tools.forEach(tool => {
        console.log('  -', tool);
      });
      
      console.log('\n⚠️  Warnings:');
      result.processedInstructions.warnings.forEach(warning => {
        console.log('  -', warning);
      });
      
      console.log('\n📝 Steps:');
      result.processedInstructions.steps.forEach(step => {
        console.log(`  ${step.stepNumber}. ${step.instruction}`);
        console.log(`     Time: ${step.estimatedTime}`);
        if (step.tips) {
          console.log(`     Tip: ${step.tips}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ Error:', result.error);
      console.log('Code:', result.code);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.message);
  }
}

// Run the test
testInstructionAPI(); 