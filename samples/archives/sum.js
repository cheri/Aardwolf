function sumDigits(num) {
     var i, sum = 0;                  // can declare two variables at once

     for (i = 1; i <= num; i++) {
             sum += i;              // add each number to sum (ie, 1 + 2 + ...+ num)
     }

     // Display result
     alert("The sum of the digits from 1 to "+ num + " is: " + sum);
}
