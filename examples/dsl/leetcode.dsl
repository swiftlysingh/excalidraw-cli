@direction TB
@spacing 60

{Understand Error?} -> "yes" -> [Review Approach]
{Understand Error?} -> "no" -> {Need Hint?}

[Review Approach] -> {Need Hint?}

{Need Hint?} -> "yes" -> [Debug Step by Step]
{Need Hint?} -> "no" -> [Check Discussion]

(Start Problem) -> [Read Problem]
[Read Problem] -> [Attempt Solution]
[Debug Step by Step] -> [Attempt Solution]
[Check Discussion] -> [Attempt Solution]

[Attempt Solution] -> [Run Tests]
[Run Tests] -> {All Tests Pass?}

{All Tests Pass?} -> "no" -> {Understand Error?}
{All Tests Pass?} -> "yes" -> [Submit Solution]

[Submit Solution] -> {Accepted?}

{Accepted?} -> "no" -> [Review Edge Cases]
{Accepted?} -> "yes" -> (Success!)

[Review Edge Cases] -> [Fix Bug]
[Fix Bug] -> [Attempt Solution]
