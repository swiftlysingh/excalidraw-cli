# API request flow with caching
@direction LR

[Client] -> [API Gateway] -> {Cached?}
{Cached?} -> "yes" -> [[Cache]] -> [Response]
{Cached?} -> "no" -> [Service] -> [[Database]] -> [[Cache]] -> [Response]
[Response] -> [Client]
