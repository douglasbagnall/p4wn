#!/bin/bash

cd $(dirname $0)
rsync -rLv ../website/ dbagnall@web.sourceforge.net:/home/project-web/p4wn/htdocs
