@direction LR
@spacing 100

[SwiftUI View] -> [ViewModel]
[ViewModel] -> [API Service]
[ViewModel] -> [Core Data]
[API Service] -> [Network Layer]
[Network Layer] -> [Backend API]
[Backend API] -> [Remote Database]
[Core Data] -> [Sync Manager]
[Sync Manager] --> [Remote Database]
