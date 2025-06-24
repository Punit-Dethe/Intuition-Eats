// Taste profile parameters and their weights
const TASTE_PARAMETERS = {
    sweet: 0,
    spicy: 0,
    tangy: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    creamy: 0,
    crunchy: 0,
    smoky: 0,
    fresh: 0,
    rich: 0,
    light: 0,
    hot: 0,
    cold: 0
};

// Menu items with their taste profiles
const MENU_ITEMS = {
    "Margherita Pizza": {
        sweet: 20,
        spicy: 0,
        tangy: 30,
        salty: 40,
        sour: 10,
        bitter: 0,
        umami: 60,
        creamy: 40,
        crunchy: 20,
        smoky: 0,
        fresh: 30,
        rich: 50,
        light: 30,
        hot: 100,
        cold: 0
    },
    "Pepperoni Pizza": {
        sweet: 10,
        spicy: 40,
        tangy: 30,
        salty: 60,
        sour: 10,
        bitter: 0,
        umami: 70,
        creamy: 30,
        crunchy: 20,
        smoky: 50,
        fresh: 20,
        rich: 60,
        light: 20,
        hot: 100,
        cold: 0
    },
    "Spicy Chicken Burger": {
        sweet: 10,
        spicy: 70,
        tangy: 20,
        salty: 50,
        sour: 10,
        bitter: 0,
        umami: 60,
        creamy: 30,
        crunchy: 40,
        smoky: 30,
        fresh: 20,
        rich: 50,
        light: 20,
        hot: 80,
        cold: 0
    },
    "Classic Cheeseburger": {
        sweet: 20,
        spicy: 20,
        tangy: 30,
        salty: 50,
        sour: 10,
        bitter: 0,
        umami: 70,
        creamy: 40,
        crunchy: 30,
        smoky: 20,
        fresh: 20,
        rich: 60,
        light: 20,
        hot: 80,
        cold: 0
    },
    "Crispy French Fries": {
        sweet: 10,
        spicy: 0,
        tangy: 0,
        salty: 70,
        sour: 0,
        bitter: 0,
        umami: 30,
        creamy: 0,
        crunchy: 80,
        smoky: 20,
        fresh: 10,
        rich: 30,
        light: 40,
        hot: 90,
        cold: 0
    },
    "Ice Cream Sundae": {
        sweet: 90,
        spicy: 0,
        tangy: 0,
        salty: 0,
        sour: 0,
        bitter: 0,
        umami: 0,
        creamy: 80,
        crunchy: 20,
        smoky: 0,
        fresh: 10,
        rich: 70,
        light: 20,
        hot: 0,
        cold: 100
    },
    "Chocolate Cake": {
        sweet: 80,
        spicy: 0,
        tangy: 0,
        salty: 0,
        sour: 0,
        bitter: 20,
        umami: 0,
        creamy: 60,
        crunchy: 10,
        smoky: 0,
        fresh: 0,
        rich: 90,
        light: 10,
        hot: 0,
        cold: 0
    },
    "BBQ Chicken Wings": {
        sweet: 30,
        spicy: 60,
        tangy: 40,
        salty: 50,
        sour: 20,
        bitter: 0,
        umami: 70,
        creamy: 20,
        crunchy: 40,
        smoky: 80,
        fresh: 10,
        rich: 60,
        light: 20,
        hot: 90,
        cold: 0
    }
};

// Function to calculate similarity between two taste profiles
function calculateSimilarity(profile1, profile2) {
    let similarity = 0;
    let totalWeight = 0;
    
    for (const parameter in TASTE_PARAMETERS) {
        const diff = Math.abs(profile1[parameter] - profile2[parameter]);
        similarity += (100 - diff);
        totalWeight++;
    }
    
    return similarity / totalWeight;
}

// Function to find the closest menu item to a given taste profile
function findClosestMenuItem(tasteProfile) {
    let bestMatch = {
        item: null,
        similarity: 0
    };
    
    for (const [item, profile] of Object.entries(MENU_ITEMS)) {
        const similarity = calculateSimilarity(tasteProfile, profile);
        if (similarity > bestMatch.similarity) {
            bestMatch = {
                item: item,
                similarity: similarity
            };
        }
    }
    
    return bestMatch;
}

// Function to generate a taste profile from Gemini's response
function generateTasteProfile(geminiResponse) {
    // Initialize default profile
    const profile = { ...TASTE_PARAMETERS };
    
    try {
        // Split the response into lines
        const lines = geminiResponse.split('\n');
        
        // Look for lines containing parameter values
        lines.forEach(line => {
            // Convert to lowercase for case-insensitive matching
            const lowerLine = line.toLowerCase();
            
            // Check each parameter
            Object.keys(TASTE_PARAMETERS).forEach(param => {
                if (lowerLine.includes(param)) {
                    // Extract number from the line
                    const match = line.match(/\d+/);
                    if (match) {
                        // Ensure the value is between 0 and 100
                        const value = Math.min(100, Math.max(0, parseInt(match[0])));
                        profile[param] = value;
                    }
                }
            });
        });
        
        console.log('Generated taste profile:', profile);
        return profile;
    } catch (error) {
        console.error('Error generating taste profile:', error);
        // Return default profile if parsing fails
        return profile;
    }
}

module.exports = {
    TASTE_PARAMETERS,
    MENU_ITEMS,
    calculateSimilarity,
    findClosestMenuItem,
    generateTasteProfile
}; 