function sumDigits(num) {
     var i, sum = 0;                  

     for (i = 1; i &lt;= num; i++) {
             sum += i;             
     }

     // Display result
     alert("The sum of the digits from 1 to "+ num + " is: " + sum);
}
