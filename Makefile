
NODEJS := node
MKFILE := $(abspath $(lastword $(MAKEFILE_LIST)))
HERE := $(dir $(MKFILE))
SRC := $(HERE)/src

all:

testdir/_node-test.js: $(SRC)/engine.js $(SRC)/parse-test.js $(SRC)/auto-test-framework.js $(SRC)/auto-test-node.js
	mkdir -p $(@D)
	echo "'use strict';\n" > $@
	cat $^ >> $@

nodetest: testdir/_node-test.js
	cp $(SRC)/*.json $(<D)
	$(NODEJS) $<

nodetest-all: testdir/_node-test.js nodetest
	$(NODEJS) $< check

.PHONY: nodetest nodetest-all all
