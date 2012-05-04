
var P4_USE_TYPED_ARRAYS = true;

function test_sums(seed){
    if (seed === undefined)
        seed = 0;
    var state = {};
    var i, j, n, a;
    var N = 100000;
    p4_random_seed(state, seed);
    console.log("testing 31 bits, complete, and byte by byte", N, "iterations");
    var sum31 = 0;
    var sum31_bytes = [0, 0, 0, 0];
    var sum31_sq_bytes = [0, 0, 0, 0];
    for (i = 0; i < N; i++){
        n = p4_random31(state);
        sum31 += n;
        for (j = 0; j < 4; j++){
            var x = n & 255;
            sum31_bytes[j] += x;
            sum31_sq_bytes[j] += x * x;
            n >>>= 8;
        }
    }
    console.log(sum31 / (N * 0x7fffffff), "31 bit average");
    console.log("individual bytes: (byte 3 is 7 bits, should be ~0.25)");
    //expected variance is (range)/12
    for (j = 0; j < 4; j++){
        a = sum31_bytes[j] / N;
        var variance = (sum31_sq_bytes[j] - sum31_bytes[j] * a) / (N * 255 * 255);
        console.log(j, (a / 255).toPrecision(4) +
                    ' sqrt(variance*12) ' + Math.sqrt(12 * variance).toPrecision(4));
    }
}

console.log("seed 0");
test_sums(0);
console.log("seed 1");
test_sums(1);
console.log("seed 123456");
test_sums(123456);
