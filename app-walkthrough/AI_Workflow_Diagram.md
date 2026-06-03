# AI Workflow Diagram

This document illustrates the step-by-step process of the core AI Food Scanning feature within the application.

```mermaid
graph TD
    %% Styling
    classDef userAction fill:#22c55e,stroke:#fff,stroke-width:2px,color:#fff;
    classDef systemProcess fill:#f59e0b,stroke:#fff,stroke-width:2px,color:#fff;
    classDef aiProcess fill:#3b82f6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef database fill:#6366f1,stroke:#fff,stroke-width:2px,color:#fff;

    %% Nodes
    A[User taps Scan Button]:::userAction --> B[Camera Overlay Opens]:::systemProcess
    B --> C[User Captures Image of Food]:::userAction
    C --> D[Image Compression & Pre-processing]:::systemProcess
    D --> E[Upload Image / Convert to Base64]:::systemProcess
    E --> F[Send Request to AI Model API]:::systemProcess
    
    subgraph AI Processing Engine
        F --> G{Vision AI Analysis}:::aiProcess
        G --> H[Identify Food Items & Ingredients]:::aiProcess
        G --> I[Estimate Portion Size / Weight]:::aiProcess
        G --> J[Calculate Macros & Calories]:::aiProcess
    end
    
    H & I & J --> K[Compile JSON Response]:::aiProcess
    K --> L[App Receives AI Data]:::systemProcess
    L --> M[Display Confirmation Modal]:::systemProcess
    M --> N{User Reviews Data}:::userAction
    
    N -- Adjusts Values --> O[Manual Edit]:::userAction
    N -- Approves --> P[Confirm Log]:::userAction
    O --> P
    
    P --> Q[Save to Supabase Database]:::database
    Q --> R[Update Daily Dashboard UI]:::systemProcess
```

## Description of Flow
1. **Capture:** The user initiates the camera via the floating action button and captures an image.
2. **Pre-processing:** The app compresses the image to ensure quick upload times and minimal payload size.
3. **AI Inference:** The image is passed to a Vision AI model which is prompted to identify the food, estimate its volume, and return a structured JSON mapping of calories, protein, carbs, and fats.
4. **Validation:** The AI's estimations are presented to the user. The user can either accept them directly or make manual tweaks if the AI was slightly off.
5. **Persistence:** The final approved nutrition data is logged to the user's daily record in the Supabase backend.
