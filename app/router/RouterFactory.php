<?php

use Nette\Application\Routers\RouteList,
    Nette\Application\Routers\Route;


/**
 * Router factory.
 */
class RouterFactory
{

    /**
     * @return Nette\Application\IRouter
     */
    public function createRouter()
    {
        $router = new RouteList();

        $router[] = new Route('[<id [0-9]+>][/<value1>][/<value2>][/<value3>][/<value4>]', 'Homepage:default');

        $router[] = new Route('<presenter>/<action>[/<id>][/<value>]', 'Homepage:default');

        return $router;
    }

}
