export enum Scope {
    
    // Spettri
    ReadSpectrum = "cc5230d8-99c8-486d-b237-8690249e57fe", // Leggere gli spettri
    WriteSpectrum = "f60acf34-eb6b-49f3-b488-4d71b5f39341", // Caricare e modificare spettri
    DeleteSpectrum = "fbe32141-3280-44f6-83e2-ccbd54aa03c2", // Eliminare spettri

    // Esperimenti
    ReadExperiment = "e0f812ee-8b0e-46f7-a18c-8ba7f8b6888b",
    WriteExperiment = "6653755d-9bb1-4a72-9001-b7dbb729201a",
    DeleteExperiment = "20e50c37-ed7e-453d-83dc-1ffdc16f204f",

    // Modelli AI
    ReadModel = "b04fbd8f-05b8-4412-8782-2d5d311e72a4",
    TrainModel = "91337c44-aedd-4a46-8fc5-199bd337b986",
    DeleteModel = "d4fd4f05-92c4-4386-af9f-a59886a1f201",

    // Account
    ReadProfile = "cd29ee0d-c3cc-43d7-8bae-0fc91aef3c7c",
    EditProfile = "27453237-c78b-4dbd-a593-0025a46c9f23",
    DeleteAccount = "e736ffe5-d072-43d7-a295-de67cb644b38",

    // Accessi
    ManageAccess = "b7019c66-e78f-4bb3-bfe4-d773d19da4ec",
    AdminAll = "2c7dd541-54c7-4afc-acfa-a69c44954881",
}