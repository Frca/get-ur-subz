<?php

/**
 * Base presenter for all application presenters.
 */
abstract class BasePresenter extends Nette\Application\UI\Presenter
{
    public function getPureName()
    {
        $pos = strrpos($this->name, ':');
        if (is_int($pos)) {
            return substr($this->name, $pos + 1);
        }

        return $this->name;
    }

    public function getTemplateRoute($action, $presenter = NULL)
    {
        if ($presenter === NULL)
            $presenter = $this->getPureName();

        return ROOT_DIR . 'app/templates/'.$presenter.'/'.$action.'.latte';
    }
}
