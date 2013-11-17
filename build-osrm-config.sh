#!/bin/bash

die () {
  echo "$@"
  exit 1
}

if [ "$#" -ne 2 ]
then
  die "Usage: build-osrm-config profile.lua port"
fi


if [ ! -d /opt/Project-OSRM ]
then
    cd /opt || die cant cd to /opt
    git clone https://github.com/DennisOSRM/Project-OSRM.git
    git checkout -b  v0.3.5 v0.3.5
fi


filename=${1##*/}
soloname=${filename%.*}
dirname="/opt/${soloname}"

echo create dir  $dirname
mkdir -pv $dirname || die cant create directory $dirname

cd $dirname || die cant cd to $dirname

builddir=$dirname/build

cp -a /opt/Project-OSRM/* $dirname/ || die
mkdir -pv  $builddir || die
cd $builddir

cp -av /opt/Project-OSRM/profiles $builddir/ || die
cp -av /opt/maps/parc-saint-maur.osm.bz2 $builddir/map.osm.bz2 || die
cp -av $1 $builddir/profile.lua || die

$builddir/osrm-extract map.osm.bz2
$builddir/osrm-prepare map.osrm

cat <<EOF > server.ini || die
Threads = 8
IP = 0.0.0.0
Port = $2

hsgrData=${builddir}/map.osrm.hsgr
nodesData=${builddir}/map.osrm.nodes
edgesData=${builddir}/map.osrm.edges
ramIndex=${builddir}/map.osrm.ramIndex
fileIndex=${builddir}/map.osrm.fileIndex
namesData=${builddir}/map.osrm.names
timestamp=${builddir}/map.osrm.timestamp
EOF


nohup 2>&1 $builddir/osrm-routed | logger -t osrm-indus  &
exit 0