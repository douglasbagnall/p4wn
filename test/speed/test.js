board=boardstring="23456432111111110000000000000000000000000000000099999999ABCDECBA"
boardarray=[]
boardarray2=[]
simple=1
aa=0
pl=[]
pl2=[]
for (z=board.length;z>=0;z--){
    pl[z]=boardarray[z]=parseInt(board.charCodeAt(z),26)
    pl2[z]=[parseInt(board.charCodeAt(z),26)]
    boardarray2[z]=[1,2,3,4,5,6,7,8,9,0,11,12,13]
}
millisecs=new Array
labels=new Array
shortarray=[1,2,3]
function dummy(){
    return 1;
}

function compare(a,b){
    return a[0]-b[0];
}

compare2= new Function('a','b','return a-b')

no=250000;
function test_logic(){
    var e=-1
    labels[++e]="empty loop"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
    }
/*
    labels[++e]="x/8"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	 	8/8
    }//*/
/*
    labels[++e]="x>>3"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	 	8>>3
    }//*/
/*
    labels[++e]="x*8"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	 	8*8
    }//*/
/*
    labels[++e]="x<<3"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	 	8<<3
    }//*/

/*
    labels[++e]="for (x in y) (with locals)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        var x,gree3,bacopy=boardarray
        for (x in bacopy){
        //gree3=x
        }
    }//*/

    /*
    labels[++e]="for loop"
    millisecs[e]=new Date()    
    var list=[1,2,3,4,5,6,7,8,9,0,1,2,23,4];
    var len =list.length;
    var zz,z=0;
    for (w=0;w<no;w++){
	for(z=0;z<len;z++){
	    zz=list[z];
	    if(zz<20){
		break;		
	    }
	}
    }
    
    //*/

    /*
    labels[++e]="while loop"
    millisecs[e]=new Date()    
    var list=[1,2,3,4,5,6,7,8,9,0,1,2,23,4];
    var len =list.length;
    var zz,z=0;
    for (w=0;w<no;w++){
	while (z++<len && zz<20){
	    zz=list[z];
	    //z++;
	}
    }
    //*/

    //*/
    /*
    labels[++e]="adding to list with l[++k]"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
    var mvl=[];
    var k=-1;
    for (w=0;w<no;w++){
	mvl[++k]=1;
    }
    mvl=[]
    }//*/
    /*
    labels[++e]="adding to list with l[k++]"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
    var mvl=[];
    var k=0;
    for (w=0;w<no;w++){
	mvl[k++]=1;
    }
    mvl=[]
    }//*/
    /*
    labels[++e]="shifting list"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	var a=[1];a[50]=1;
	while (a.length){
	    var aa=a.shift();
	}
    }//*/
    /*
    labels[++e]="for looping list"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	var a=[1];a[50]=1;
	for (var z=0;z<50;z++){
	    var aa=a[z];
	}

    }//*/

    /*
    labels[++e]="z=0;for(;z<50;y=++z){}"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
		var z=0,y=0;for(;y<50;y=++z){}
    }//*/
    /*
    labels[++e]="for (var z=0;z<50;y=++z){}"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        for (var y=0,Z=0;Z<50;y=++Z){}
    }//*/
    /*
    labels[++e]="for (z=0;z++<50;){y=z}"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        for (z=0;z++<50;){y=z}
    }//*/
    /*
    labels[++e]="for (z=0;z<50;z++){y=z} "
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
		for(z=0;z<50;z++){y=z};
    }//*/

    var shortarray=[1,2,3,4,5,6,7,8];
    var sa=shortarray[3]
    labels[++e]="access local array"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        var sa2=shortarray[sa];
    }//*/
    labels[++e]="accesss local var"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	var sa2=sa;
    }//*/

    labels[++e]="simple assignment"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	var sa2=1+1;
    }//*/
    /*
    labels[++e]="for (z=0;z<8;z++) (explicit)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        //var bal=shortarray.length
        for (z=0;z<8;z++){
        }
    }//*/
    /*
    labels[++e]="for (z=0;z<y.length;z++) (length attr)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
	//        bal=boardarray.length
        for (z=0;z<shortarray.length;z++){
        }
    }//*/

    /*
    labels[++e]="for (z=0..) local, access"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        var gree2,z2,bal2=boardarray.length
        for (z2=0;z2<bal;z2++){
        boardarray[z2]
        }
    }//*/
/*
    labels[++e]="for (z=0..) local, no access to y[z]"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        var z2,bal2=boardarray.length
        for (z2=0;z2<bal2;z2++){
        }
    }//*/
/*
    labels[++e]="for (z=0..) ex-loop local, no access to y[z]"
    millisecs[e]=new Date()
	var z3,bal3=boardarray.length
    for (w=0;w<no;w++){
        for (z3=0;z3<bal3;z3++){
        }
    }//*/
/*
	labels[++e]="array sort"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        q=pl2.sort()
        //x=q[0]
    }//*/
/*
	labels[++e]="array sort with z[0] numeric compare"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        q=pl2.sort(compare)
        //x=q[0]
    }//*/
/*
	labels[++e]="array sort with numeric compare2"
    millisecs[e]=new Date()
    c2=compare2
    for (w=0;w<no;w++){
        q=boardarray.sort(c2)
        //x=q[0]
    }//*/
/*
	labels[++e]="array reverse"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        q=boardarray.reverse()
        //x=q[0]
    }//*/
/*
    labels[++e]="array scan in for"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        x=0
        for(z=0;z<boardarray.length;z++){
        if(x<boardarray[z])x=boardarray[z]
        }
    }//*/
/*
    labels[++e]="Math.max of array"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        x=Math.max(boardarray)
    }//*/
/*
    labels[++e]="nested for"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        for(y=0;y<64;y+=8){
            for(x=0;x<8;x++){
                yx=y+x
            }
        }
    }//*/
/*
    labels[++e]="unravelled for"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        for(yx=0;yx<64;yx++){
            y=yx&56
            x=yx&7
        }
    }//*/
/*
    labels[++e]="testing shortcircuits"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        www=(0 && 5/6/7/8/9)
    }//*/
/*
    labels[++e]="simple comparison"
    millisecs[e]=new Date()       //timing routine
    for (w=0;w<no;w++){
        m=(simple>1)
    }//*/
/*
    labels[++e]="compare from array"
    millisecs[e]=new Date()       //timing routine
    for (w=0;w<no;w++){
            m=(boardarray[1]>1)
    }//*/
/*
    labels[++e]="loop from array length"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        for(x=0;x<boardarray.length;x++){
        }
    }//*/
/*
    labels[++e]="loop from simple var"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=boardarray.length
        for(x=0;x<c;x++){
        }
    }//*/
/*
    labels[++e]="parseInt()"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=parseInt("1")
    }//*/
/*
    labels[++e]="'1'|0"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c='1'|0
    }//*/
/*
    labels[++e]="'1'/1"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c='1'/1
    }//*/
/*
    labels[++e]="equality test"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=(1==2)
    }//*/
/*
    labels[++e]="c+=w"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c+=w
    }//*/
/*
    labels[++e]="c=c+w"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=c+w
    }//*/
/*
    labels[++e]="if(1)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        if(w%2){c=1}
        else{c=0}
    }//*/
/*
    labels[++e]="?:"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=(w%2)?1:0

    }//*/
/*
    labels[++e]="String.fromCharCode()x2"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=String.fromCharCode(65,66)
    }//*/
/*
    labels[++e]=".charCodeAt()"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=board.charCodeAt(11)
    }//*/
/*
    labels[++e]=".charAt()"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=board.charCodeAt(11)
    }//*/
/*
    labels[++e]="array[]"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=boardarray[11]
    }//*/
/*
    labels[++e]="2D Array"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=boardarray2[11][11]
    }//*/
/*
    labels[++e]="array assignment(*3)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        boardarray[11]=w
        boardarray[12]=w
        boardarray[13]=w
    }//*/
/*
    labels[++e]="array assigned[w,w,w]"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        boardarray[11]=[]
        boardarray[11][0]=w
        boardarray[12][1]=w
        boardarray[13][2]=w
    }//*/
/*
    labels[++e]="array=.fromCharCode(*4)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        boardarray[11]=String.fromCharCode(3,3,3,3)
    }//*/
/*
    labels[++e]="2D Array assign"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        boardarray2[11][11]=3
    }//*/
/*
    labels[++e]="string assign (slice)"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        board=board.slice(0,4)+board.charAt(4)+board.slice(4+1)
    }//*/
/*
    labels[++e]="assign array.slice"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        b=boardarray.slice(0)
    }//*/
/*
    labels[++e]="assign lit. array"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=[boardarray[1],boardarray[2],boardarray[3],boardarray[4]]
    }//*/
/*
    labels[++e]="array.concat()"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=boardarray.concat(boardarray)
    }//*/
/*
   labels[++e]="assign array slice"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=boardarray.slice(1,5)
    }//*/
/*
    labels[++e]="new array"
    millisecs[e]=new Date()
    for (w=0;w<no;w++){
        c=new Array(1,2,3,4)
    }//*/

    millisecs[++e]=new Date()
    empty=millisecs[1]-millisecs[0]
    string=''
    for (z=0;z<e;z++){
        string+='\n'+labels[z]+' '+((millisecs[z+1]-millisecs[z])-empty)*1000/no
    }
    string+="\n\nloop overhead:" + empty*1000/no + "\n (tested over " +no+ " cycles)"
    document.fred.bib.value=string
}
if(0){
    a=[1,2,3]
    b=a.slice(0)
    a[2]=59
    alert(b)
}
