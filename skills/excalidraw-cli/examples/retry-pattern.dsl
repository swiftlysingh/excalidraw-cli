# Retry pattern with exponential backoff
(Start) -> [Attempt Operation] -> {Success?}
{Success?} -> "yes" -> [Return Result] -> (Done)
{Success?} -> "no" -> {Retries < Max?}
{Retries < Max?} -> "yes" -> [Wait (backoff)] -> [Increment Retry] -> [Attempt Operation]
{Retries < Max?} -> "no" -> [Throw Error] -> (Failed)
