$number1 = null
$number2 = null
$number3 = null
$result = null

$ -&amp;gt;
    # Locate number input fields
    $number1 = $ '#number1'
    $number2 = $ '#number2'
    $number3 = $ '#number3'
    $result = $ '#result'
    
    ($ '#calculate').click calculate
    ($ '#reset').click reset
    
# Performs calculation
calculate = -&amp;gt;
    # read entered numbers
    a = Number $number1.val()
    b = Number $number2.val()
    c = Number $number3.val()
    
    performAddition = (n1, n2) -&amp;gt; 
        console.log 'Performing addition of '+n1+' and '+n2+'.'
        n1 + n2
    
    performMultiplication = (n1, n2) -&amp;gt;
        console.log 'Performing multiplication of '+n1+' and '+n2+'.'
        n1 * n2
    
    sum = performAddition a, b
    total = performMultiplication sum, c
    
    # Update result field
    $result.text total
    
# Clears the result and input fields
reset = -&amp;gt;
    debugger # the 'debugger' statement works also...
    $number1.val ''
    $number2.val ''
    $number3.val ''
    $result.text ''

